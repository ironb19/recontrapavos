#!/usr/bin/env python3
"""Consulta el vídeo público más reciente de la playlist de Integilentes.

La clave procede del secreto YOUTUBE_API_KEY de GitHub Actions.
"""
import json
import os
import pathlib
import urllib.parse
import urllib.request
import datetime

PLAYLIST = "PLZHzpYioa_lBN-dB_L0hJIlLtkgaJY1Vt"
KEY = os.environ.get("YOUTUBE_API_KEY")
if not KEY:
    raise SystemExit("Falta el secreto YOUTUBE_API_KEY")

items = []
token = ""
for _ in range(30):
    params = {
        "part": "snippet,contentDetails",
        "playlistId": PLAYLIST,
        "maxResults": 50,
        "key": KEY,
    }
    if token:
        params["pageToken"] = token
    url = "https://www.googleapis.com/youtube/v3/playlistItems?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": "RecontraPavosSiteUpdater/1.0"}),
        timeout=25,
    ) as response:
        obj = json.load(response)
    items.extend(obj.get("items", []))
    token = obj.get("nextPageToken", "")
    if not token:
        break
else:
    raise SystemExit("La playlist excede el máximo de páginas permitido")

videos = []
for item in items:
    sn = item.get("snippet", {})
    content = item.get("contentDetails", {})
    video_id = content.get("videoId") or sn.get("resourceId", {}).get("videoId", "")
    title = sn.get("title", "")
    published = content.get("videoPublishedAt")
    if not published or len(video_id) != 11 or title in ("Private video", "Deleted video"):
        continue
    try:
        date = datetime.datetime.fromisoformat(published.replace("Z", "+00:00"))
    except ValueError:
        continue
    videos.append((date, {"id": video_id, "title": title, "published": published}))
if not videos:
    raise SystemExit("No se encontró un episodio público; se conserva el JSON anterior")
latest = max(videos, key=lambda item: item[0])[1]
path = pathlib.Path(__file__).resolve().parents[1] / "data" / "ultimo-episodio.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(latest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Episodio actualizado:", latest["id"], latest["title"])
