# Inventory true-up — file format

This plugin diffs an external device inventory against your saved sessions. You
produce the inventory file with your own tooling (e.g. a script that pulls from
ManageEngine / AKIPS); the plugin only requires that it matches the format
below.

## Format

Either **CSV** or **JSON**, one record per device. Same fields either way.

| field            | required | meaning                                                       |
| ---------------- | -------- | ------------------------------------------------------------- |
| `name`           | yes      | Unique session name. **This is the join key.**                |
| `host`           | no       | IP address or hostname.                                       |
| `port`           | no       | Port number.                                                  |
| `username`       | no       | Login user.                                                   |
| `kind`           | no       | `ssh` \| `telnet` \| `raw` \| `serial` \| `local` (default `ssh`). |
| `folder_path`    | no       | POSIX-style path, e.g. `/Harvard/Core`.                       |
| `equipment_type` | no       | Equipment type label.                                         |
| `tags`           | no       | JSON: array of strings. CSV: `;`-separated.                   |
| `notes`          | no       | Free text.                                                    |
| `external_id`    | no       | The source system's stable device id (ManageEngine/AKIPS id, serial, asset tag). |

### CSV

First row is the header using the column names above (case-insensitive; extra
columns are ignored). Example:

```csv
name,host,port,username,kind,external_id
core01,10.30.1.5,22,admin,ssh,akips:device-8821
edge-07,10.30.2.9,22,admin,ssh,akips:device-9134
```

### JSON

An array of objects, or a `{ "sessions": [...] }` envelope:

```json
[
  { "name": "core01", "host": "10.30.1.5", "port": 22, "username": "admin", "external_id": "akips:device-8821" }
]
```

## How matching works

1. Records are joined to saved sessions by **`name`** (your names are unique).
2. The current fields compared are `host`, `port`, `username`, `kind`. A device
   whose IP changed but kept its name shows as **Changed**.
3. `external_id` is **optional**. When present, the plugin learns
   `external_id → session` on a confirmed match (stored in the plugin's own
   storage), so a later **rename** still matches by id. Nothing needs to be
   staged ahead of time, and omitting `external_id` breaks nothing.

## Missing devices

The **Missing** bucket (sessions absent from the file) is only shown when you
tick **"This file is a complete export"** — a partial pull must never read as
mass decommission.

> This version is a **read-only preview**. Applying changes back to your
> sessions lands in the next increment.
