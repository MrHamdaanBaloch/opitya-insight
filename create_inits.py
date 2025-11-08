import os

dirs = [
    "opitya-insight",
    "opitya-insight/api",
    "opitya-insight/core",
    "opitya-insight/models",
    "opitya-insight/processing",
    "opitya-insight/tests",
]

for d in dirs:
    init_path = os.path.join(d, "__init__.py")
    with open(init_path, "w", encoding="utf-8") as f:
        pass
    print(f"Created {init_path}")

print("Done.")
