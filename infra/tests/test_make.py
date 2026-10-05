"""Exercise Make's deployment routing without starting containers or reading runtime secrets."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
CI_SETTINGS = {
    "REGISTRY": "registry.example/check",
    "IMAGE_TAG": "prod-check",
    "DATA_PATH": "/tmp/check-data",
    "PROTOCOL": "https",
    "EXTERNAL_HOST": "check.example",
    "API_PORT": "8502",
    "WEB_PORT": "8501",
    "TG_PORT": "8503",
}
DOCKER_STUB = """#!/usr/bin/env python3
import json
import os
import sys

args = sys.argv[1:]
with open(os.environ['CHILL_DOCKER_CALLS'], 'a', encoding='utf-8') as calls:
    calls.write(json.dumps(args) + '\\n')
if args[:1] == ['info']:
    print(os.environ.get('CHILL_SWARM_STATE', 'active true'))
elif args[:2] == ['stack', 'config']:
    raise SystemExit(int(os.environ.get('CHILL_STACK_CONFIG_EXIT', '0')))
elif args[:2] == ['stack', 'deploy']:
    pass
elif args[:2] == ['stack', 'services']:
    print(os.environ.get('CHILL_SWARM_SERVICES', 'check-prod_api 1/1'))
elif args[:2] == ['stack', 'ps']:
    print('check-prod_api Failed: task: non-zero exit (1)')
elif args[:2] == ['service', 'ls']:
    print('api-service web-service')
elif args[:2] == ['service', 'logs']:
    print(args[-1] + ' startup log')
    raise SystemExit(int(os.environ.get('CHILL_LOG_EXIT', '0')))
elif args[:1] == ['ps']:
    print(os.environ.get('CHILL_API_CONTAINERS', 'api-container'))
elif args[:1] == ['exec']:
    raise SystemExit(int(os.environ.get('CHILL_DB_EXIT', '0')))
elif args[:1] == ['compose']:
    raise SystemExit(int(os.environ.get('CHILL_COMPOSE_CONFIG_EXIT', '0')))
else:
    raise SystemExit('Unexpected Docker command')
"""
GIT_STUB = """#!/usr/bin/env python3
import os
import sys

if sys.argv[1:] != ['rev-parse', 'HEAD']:
    raise SystemExit('Unexpected Git command')
commit = os.environ.get('CHILL_CHECKOUT_COMMIT')
if not commit:
    raise SystemExit(1)
print(commit)
"""


class MakeDeployTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="chill-make-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / "infra/compose").mkdir(parents=True)
        (self.root / "bin").mkdir()
        shutil.copyfile(ROOT / "Makefile", self.root / "Makefile")
        # The fixture deliberately excludes the runtime environment file.
        source = (ROOT / "infra/compose/prod.yml").read_text()
        (self.root / "infra/compose/prod.yml").write_text(
            source.replace("env_file: .env", "env_file: /dev/null")
        )
        docker = self.root / "bin/docker"
        docker.write_text(DOCKER_STUB)
        docker.chmod(0o755)
        git = self.root / "bin/git"
        git.write_text(GIT_STUB)
        git.chmod(0o755)
        self.calls_file = self.root / "docker.calls"
        self.manifest = self.root / "deploy.yml"

    def run_make(
        self,
        target: str,
        values: dict[str, str] | None = None,
        *,
        state: str = "active true",
        stack_exit: int = 0,
        compose_exit: int = 0,
        services: str = "check-prod_api 1/1 (max 3 per node)\ncheck-prod_web 1/1",
        log_exit: int = 0,
        commit: str = "",
        containers: str = "api-container",
        db_exit: int = 0,
    ) -> subprocess.CompletedProcess[str]:
        settings = {"ENV_FILE": "/dev/null", "ENV": "prod", "PROJECT_NAME": "check"}
        settings.update(values or {})
        env = {
            "PATH": f"{self.root / 'bin'}{os.pathsep}{os.environ['PATH']}",
            "CHILL_DOCKER_CALLS": str(self.calls_file),
            "CHILL_SWARM_STATE": state,
            "CHILL_STACK_CONFIG_EXIT": str(stack_exit),
            "CHILL_COMPOSE_CONFIG_EXIT": str(compose_exit),
            "CHILL_SWARM_SERVICES": services,
            "CHILL_LOG_EXIT": str(log_exit),
            "CHILL_CHECKOUT_COMMIT": commit,
            "CHILL_API_CONTAINERS": containers,
            "CHILL_DB_EXIT": str(db_exit),
        }
        return subprocess.run(
            ["make", "--no-print-directory", target, *(f"{key}={value}" for key, value in settings.items())],
            cwd=self.root,
            env=env,
            text=True,
            capture_output=True,
            timeout=15,
        )

    def calls(self) -> list[list[str]]:
        if not self.calls_file.exists():
            return []
        return [json.loads(line) for line in self.calls_file.read_text().splitlines()]

    def existing_manifest(self) -> str:
        source = 'version: "3.8"\nservices:\n  api:\n    image: registry.example/check/api:ci-release\n'
        self.manifest.write_text(source)
        return source

    def test_missing_ci_settings_stop_before_docker(self) -> None:
        result = self.run_make("up")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Missing CI setting: IMAGE_TAG", result.stderr)
        self.assertIn("Run the CI/CD deployment", result.stderr)
        self.assertFalse(self.manifest.exists())
        self.assertEqual(self.calls(), [])

    def test_new_checkout_cannot_deploy_old_ci_images(self) -> None:
        self.existing_manifest()
        result = self.run_make("up", {**CI_SETTINGS, "IMAGE_TAG": "prod-e2ba7e8"}, commit="3591973" + "0" * 33)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("does not match checkout", result.stderr)
        self.assertIn("git pull does not rebuild images", result.stderr)
        self.assertEqual(self.calls(), [])

    def test_overriding_image_tag_does_not_hide_old_ci_commit(self) -> None:
        result = self.run_make("up", {**CI_SETTINGS, "IMAGE_TAG": "prod-3591973", "COMMIT_SHA": "e2ba7e8" + "0" * 33}, commit="3591973" + "0" * 33)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls(), [])

    @unittest.skipUnless(shutil.which("envsubst"), "envsubst is required for manifest generation")
    def test_matching_ci_commit_can_deploy(self) -> None:
        commit = "3591973" + "0" * 33
        result = self.run_make("up", {**CI_SETTINGS, "IMAGE_TAG": "prod-3591973", "COMMIT_SHA": commit}, commit=commit)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls()[-1][:2], ["stack", "deploy"])

    def test_saved_manifest_must_match_ci_image_tag(self) -> None:
        self.manifest.write_text('version: "3.8"\nservices:\n  web:\n    image: "registry.example/check/check/web:prod-e2ba7e8"\n')
        result = self.run_make("up", {**CI_SETTINGS, "IMAGE_TAG": "prod-3591973"}, commit="3591973" + "0" * 33)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("different CI image tag", result.stderr)
        self.assertEqual(self.calls(), [["stack", "config", "-c", "deploy.yml"]])

    @unittest.skipUnless(shutil.which("envsubst"), "envsubst is required for manifest generation")
    def test_missing_manifest_is_generated_before_swarm_deployment(self) -> None:
        result = self.run_make("up", CI_SETTINGS)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("registry.example/check/check/api:prod-check", self.manifest.read_text())
        calls = self.calls()
        self.assertEqual(calls[0][:2], ["stack", "config"])
        self.assertEqual(calls[1][0], "info")
        self.assertEqual(calls[2], ["stack", "deploy", "-c", "deploy.yml", "--with-registry-auth", "--prune", "check-prod"])

    @unittest.skipUnless(shutil.which("envsubst"), "envsubst is required for manifest generation")
    def test_ci_values_loaded_from_make_include_are_exported(self) -> None:
        settings = self.root / "runtime.cfg"
        settings.write_text("".join(f"{key}={value}\n" for key, value in CI_SETTINGS.items()))
        result = self.run_make("check-deploy", {"ENV_FILE": str(settings)})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("registry.example/check/check/api:prod-check", self.manifest.read_text())
        self.assertEqual(len(self.calls()), 1)

    @unittest.skipUnless(shutil.which("envsubst"), "envsubst is required for manifest generation")
    def test_invalid_generated_manifest_is_removed_without_deployment(self) -> None:
        result = self.run_make("up", CI_SETTINGS, stack_exit=1)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.manifest.exists())
        self.assertEqual(list(self.root.glob("deploy.yml.*")), [])
        self.assertEqual(len(self.calls()), 1)

    def test_ci_artifact_is_reused_without_regeneration(self) -> None:
        source = self.existing_manifest()
        result = self.run_make("up")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.manifest.read_text(), source)
        self.assertEqual(self.calls()[0], ["stack", "config", "-c", "deploy.yml"])
        self.assertEqual(self.calls()[-1][-1], "check-prod")

    def test_check_validates_swarm_without_deploying(self) -> None:
        self.existing_manifest()
        result = self.run_make("check")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("manager ready", result.stdout)
        self.assertEqual(len(self.calls()), 2)

    def test_non_manager_does_not_deploy(self) -> None:
        self.existing_manifest()
        for state in ("inactive false", "active false"):
            with self.subTest(state=state):
                result = self.run_make("up", state=state)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("docker swarm init", result.stderr)
        self.assertFalse(any(call[:2] == ["stack", "deploy"] for call in self.calls()))

    def test_invalid_existing_manifest_does_not_deploy(self) -> None:
        self.existing_manifest()
        result = self.run_make("up", stack_exit=1)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls(), [["stack", "config", "-c", "deploy.yml"]])

    def test_pre_uses_swarm_with_its_own_namespace(self) -> None:
        self.existing_manifest()
        result = self.run_make("up", {"ENV": "PRE"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls()[-1][-1], "check-pre")

    def test_local_check_and_start_use_compose(self) -> None:
        result = self.run_make("up", {"ENV": "local"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.manifest.exists())
        self.assertEqual(self.calls()[0][-2:], ["config", "--quiet"])
        self.assertEqual(self.calls()[1][-2:], ["up", "--build"])
        self.assertTrue(all(call[0] == "compose" for call in self.calls()))

    def test_invalid_compose_config_does_not_start(self) -> None:
        result = self.run_make("up", {"ENV": "local"}, compose_exit=1)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(self.calls()), 1)

    def test_ready_accepts_all_running_replicas(self) -> None:
        result = self.run_make("ready", {"READY_TIMEOUT": "0"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("requested running replicas", result.stdout)
        self.assertEqual(self.calls(), [["stack", "services", "check-prod", "--format", "{{.Name}} {{.Replicas}}"]])

    def test_ready_rejects_failed_missing_or_zero_replicas(self) -> None:
        for services in ("check-prod_api 0/1 (max 3 per node)", "", "check-prod_api 0/0", "check-prod_api 1/2"):
            with self.subTest(services=services):
                result = self.run_make("ready", {"READY_TIMEOUT": "0"}, services=services)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("failed to become ready", result.stderr)
                self.assertIn("non-zero exit (1)", result.stdout)
                self.assertEqual(self.calls()[-1], ["stack", "ps", "--no-trunc", "check-prod"])

    def test_log_alias_waits_for_all_service_logs(self) -> None:
        result = self.run_make("log")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("api-service startup log", result.stdout)
        self.assertIn("web-service startup log", result.stdout)
        self.assertEqual(self.calls()[0], ["service", "ls", "-q", "--filter", "label=com.docker.stack.namespace=check-prod"])
        self.assertCountEqual(self.calls()[1:], [["service", "logs", "--tail=1000", service] for service in ("api-service", "web-service")])

    def test_log_failure_is_reported(self) -> None:
        result = self.run_make("log", log_exit=1)
        self.assertNotEqual(result.returncode, 0)

    def test_local_log_alias_uses_compose(self) -> None:
        result = self.run_make("log", {"ENV": "local"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls()[0][-1], "logs")
        self.assertEqual(self.calls()[0][0], "compose")

    def test_tasks_shows_full_errors_for_the_selected_stack(self) -> None:
        result = self.run_make("tasks", {"ENV": "PRE"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls(), [["stack", "ps", "--no-trunc", "check-pre"]])

    def test_database_check_uses_the_running_api_container(self) -> None:
        result = self.run_make("check-db", containers="api-container\nother-container")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls(), [
            ["ps", "--filter", "status=running", "--filter", "label=com.docker.swarm.service.name=check-prod_api", "--format", "{{.ID}}"],
            ["exec", "api-container", "python", "-m", "services.check_db"],
        ])

    def test_database_check_propagates_connectivity_failure(self) -> None:
        result = self.run_make("check-db", db_exit=1)
        self.assertNotEqual(result.returncode, 0)

    def test_database_check_reports_missing_container(self) -> None:
        result = self.run_make("check-db", containers="")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("No API container is running", result.stderr)
        self.assertEqual(len(self.calls()), 1)

    def test_local_database_check_uses_compose(self) -> None:
        result = self.run_make("check-db", {"ENV": "local"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls()[0][-6:], ["exec", "-T", "api", "python", "-m", "services.check_db"])


if __name__ == "__main__":
    unittest.main()
