import sys
sys.path.insert(0, ".")
from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY
import urllib.request, urllib.error

print("SUPABASE_URL       :", repr(SUPABASE_URL))
print("SUPABASE_URL len    :", len(SUPABASE_URL))
print("ANON_KEY len         :", len(SUPABASE_ANON_KEY))
print("ANON_KEY dots (debe ser 2, formato JWT):", SUPABASE_ANON_KEY.count("."))
print("ANON_KEY first 15    :", repr(SUPABASE_ANON_KEY[:15]))
print("ANON_KEY last 15     :", repr(SUPABASE_ANON_KEY[-15:]))
print("ANON_KEY contiene salto de linea:", "\n" in SUPABASE_ANON_KEY or "\r" in SUPABASE_ANON_KEY)

url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
req = urllib.request.Request(url, headers={"apikey": SUPABASE_ANON_KEY})
print("\nProbando:", url)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print("STATUS:", resp.status)
        print("BODY  :", resp.read()[:300])
except urllib.error.HTTPError as e:
    print("HTTP ERROR STATUS:", e.code)
    print("BODY:", e.read()[:500])
