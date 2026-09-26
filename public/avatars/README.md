# Pre-packaged Avatars
To ship avatars with the app by default:
1. Place the `.vrm` or `.glb` files in this folder (`/public/avatars/`).
2. Update the `avatars.json` file in this folder to include the new avatars.
Example `avatars.json` format:
```json
[
  {
    "id": "my-avatar-1",
    "name": "My Cool Avatar",
    "url": "avatars/my-cool-avatar.vrm"
  }
]
```
