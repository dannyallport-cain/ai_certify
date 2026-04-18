import base64
import datetime
import hmac
import hashlib
import json
import re
import time
import urllib.request
import urllib.error

with open(".env", "r", encoding="utf-8") as f:
    env_text = f.read()

match = re.search(r"^AUTH_SECRET=(.+)$", env_text, re.M)
if not match:
    raise RuntimeError("AUTH_SECRET not found in .env")

key = match.group(1).strip().strip("\"'")

header = {"alg": "HS256"}
payload = {
    "user": {"id": 209},
    "expires": (datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=1)).isoformat(),
}

def b64(obj):
    return base64.urlsafe_b64encode(json.dumps(obj, separators=(",", ":")).encode()).rstrip(b"=")

signing_input = b".".join([b64(header), b64(payload)])
sig = base64.urlsafe_b64encode(hmac.new(key.encode(), signing_input, hashlib.sha256).digest()).rstrip(b"=")
session_token = (signing_input + b"." + sig).decode()

with open("/tmp/test-avatar-data-url.txt", "r", encoding="utf-8") as f:
    data_url = f.read().strip()

base_url = "http://127.0.0.1:3000"

session_request = urllib.request.Request(
    "http://127.0.0.1:3000/api/user/mobile-capture/session",
    data=json.dumps({"kind": "avatar"}).encode(),
    headers={
        "Content-Type": "application/json",
        "Cookie": f"session={session_token}",
    },
)
try:
    session_response = urllib.request.urlopen(session_request)
except urllib.error.HTTPError as error:
    print("session_status", error.code)
    print(error.read().decode())
    raise

session_payload = json.loads(session_response.read().decode())

token_match = re.search(r"[?&]token=([^&]+)", session_payload["captureUrl"])
if not token_match:
    raise RuntimeError(f"Token not found in captureUrl: {session_payload}")

upload_request = urllib.request.Request(
    "http://127.0.0.1:3000/api/user/mobile-capture",
    data=json.dumps({"token": token_match.group(1), "dataUrl": data_url}).encode(),
    headers={"Content-Type": "application/json"},
)
upload_response = urllib.request.urlopen(upload_request)
upload_payload = json.loads(upload_response.read().decode())

user_request = urllib.request.Request(
    f"{base_url}/api/user",
    headers={
        "Cookie": f"session={session_token}",
    },
)
user_response = urllib.request.urlopen(user_request)
user_payload = json.loads(user_response.read().decode())

print(json.dumps({
    "session": session_payload,
    "upload": upload_payload,
    "user": {
        "id": user_payload.get("id"),
        "avatarUrl": user_payload.get("avatarUrl"),
        "avatarUpdatedAt": user_payload.get("avatarUpdatedAt"),
    },
}, indent=2))
