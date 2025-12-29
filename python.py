from datetime import datetime, timezone
from zoneinfo import ZoneInfo  # Python 3.9+

now = (
    datetime.now(timezone.utc)
    .astimezone(ZoneInfo("America/Chicago"))
    .date()
    .isoformat()
)

print(now)
