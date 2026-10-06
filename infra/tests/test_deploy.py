"""Replay the SSH deployment using public fixtures and harmless command stubs."""

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[2]
TOOL_STUB = """#!/usr/bin/env python3
import json
import os
from pathlib import Path
import sys

tool = Path(sys.argv[0]).name
args = sys.argv[1:]
if tool == 'sudo':
    os.execvp(args[0], args)
record = {'tool': tool, 'args': args, 'cwd': os.getcwd()}
if tool == 'make' and args[:1] == ['check-deploy']:
    settings = next(arg.split('=', 1)[1] for arg in args if arg.startswith('ENV_FILE='))
    record['settings'] = dict(line.split('=', 1) for line in Path(settings).read_text().splitlines())
    Path('deploy.yml').write_text('fixture manifest')
with open(os.environ['CHILL_DEPLOY_CALLS'], 'a') as calls:
    calls.write(json.dumps(record) + '\\n')
if tool == 'docker' and args[:2] == ['stack', 'deploy']:
    manifest = Path(args[args.index('--compose-file') + 1])
    if not manifest.is_absolute() or not manifest.is_file():
        raise SystemExit(f'Cannot open deployment manifest: {manifest}')
"""


@unittest.skipUnless(shutil.which("jq"), "jq is required by the deployment script")
class DeployPathTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory(prefix="chill-deploy-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name).resolve()
        self.repo = self.root / "web"
        self.data = self.root / "store"
        (self.repo / "infra/compose").mkdir(parents=True)
        (self.repo / "data").mkdir()
        (self.root / "bin").mkdir()
        self.calls_file = self.root / "calls"
        self.values = {
            "FOLDER": str(self.repo),
            "DATA_PATH": str(self.data),
            "PROJECT_NAME": "check",
            "REGISTRY_HOST": "registry.example",
            "REGISTRY_OWNER": "check",
            "REGISTRY_USER": "fixture-user",
        }
        # Never open or generate the repository's runtime environment files.
        (self.repo / "infra/compose/runtime.keys").write_text(
            "FOLDER\nDATA_PATH\nPROJECT_NAME\nENV\nCOMMIT_SHA\nRELEASE\nIMAGE_TAG\nREGISTRY\nSTACK_NAME\n"
        )
        for name in ("git", "make", "docker", "sudo"):
            stub = self.root / "bin" / name
            stub.write_text(TOOL_STUB)
            stub.chmod(0o755)

    def run_deploy(self, source: str | None = None) -> subprocess.CompletedProcess[str]:
        source = source if source is not None else (ROOT / ".github/workflows/deploy-prod.yml").read_text()
        script = textwrap.dedent(source.split("          script: |\n", 1)[1])
        values = {f"vars.{key}": value for key, value in self.values.items()}
        values.update({
            "env.ENV": "prod",
            "github.server_url": "https://github.com",
            "github.repository": "check/web",
            "github.sha": "f" * 40,
            "needs.build-and-push.outputs.release": "fffffff",
            "needs.build-and-push.outputs.image_tag": "prod-fffffff",
            "secrets.REGISTRY_TOKEN": "fixture-token",
        })
        script = re.sub(r"\$\{\{\s*(.*?)\s*\}\}", lambda match: values[match[1]], script)
        script = script.replace(".env.list", "runtime.keys").replace(".env", "runtime.cfg")
        self.calls_file.unlink(missing_ok=True)
        return subprocess.run(
            ["bash", "-c", script],
            cwd=self.root,
            env={
                "PATH": f"{self.root / 'bin'}{os.pathsep}{os.environ['PATH']}",
                "HOME": os.environ["HOME"],
                "CHILL_DEPLOY_CALLS": str(self.calls_file),
                "ENV_VARS_JSON": json.dumps(self.values),
                "ENV_SECRETS_JSON": "{}",
            },
            capture_output=True,
            text=True,
            timeout=15,
        )

    def calls(self) -> list[dict]:
        return [json.loads(line) for line in self.calls_file.read_text().splitlines()]

    def test_absolute_tilde_and_relative_paths_survive_runtime_import(self) -> None:
        home = os.environ["HOME"]
        paths = (
            (str(self.repo), str(self.data)),
            (f"~/{os.path.relpath(self.repo, home)}", f"~/{os.path.relpath(self.data, home)}"),
            ("web", "../store"),
        )
        for folder, data in paths:
            with self.subTest(folder=folder):
                self.values.update(FOLDER=folder, DATA_PATH=data)
                result = self.run_deploy()
                self.assertEqual(result.returncode, 0, result.stderr)
                calls = self.calls()
                compile_call = next(call for call in calls if call["tool"] == "make")
                self.assertEqual(Path(compile_call["settings"]["FOLDER"]), self.repo)
                self.assertEqual(Path(compile_call["settings"]["DATA_PATH"]).resolve(), self.data)
                self.assertTrue(Path(compile_call["settings"]["DATA_PATH"]).is_absolute())
                deploy_call = next(call for call in calls if call["args"][:2] == ["stack", "deploy"])
                self.assertEqual(deploy_call["args"][3], str(self.repo / "deploy.yml"))
                self.assertTrue((self.data / "redis").is_dir())
                self.assertEqual([call["args"][0] for call in calls if call["tool"] == "make"], ["check-deploy", "ready", "check-db"])

    def test_failed_checkout_directory_stops_before_docker(self) -> None:
        self.values["FOLDER"] = str(self.root / "missing")
        result = self.run_deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(call["tool"] in ("docker", "make") for call in self.calls()))


if __name__ == "__main__":
    unittest.main()
