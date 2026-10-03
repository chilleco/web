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
elif args[:1] == ['compose']:
    raise SystemExit(int(os.environ.get('CHILL_COMPOSE_CONFIG_EXIT', '0')))
else:
    raise SystemExit('Unexpected Docker command')
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
    ) -> subprocess.CompletedProcess[str]:
        settings = {"ENV_FILE": "/dev/null", "ENV": "prod", "PROJECT_NAME": "check"}
        settings.update(values or {})
        env = {
            "PATH": f"{self.root / 'bin'}{os.pathsep}{os.environ['PATH']}",
            "CHILL_DOCKER_CALLS": str(self.calls_file),
            "CHILL_SWARM_STATE": state,
            "CHILL_STACK_CONFIG_EXIT": str(stack_exit),
            "CHILL_COMPOSE_CONFIG_EXIT": str(compose_exit),
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


if __name__ == "__main__":
    unittest.main()
