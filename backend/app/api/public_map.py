from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(
    prefix="/api/public/map",
    tags=["Public Map"],
)

COMMUNITIES_URL = (
    "https://services2.arcgis.com/"
    "hUPR9iC6qnMcwWsa/"
    "ArcGIS/rest/services/communities/FeatureServer/0/query"
)


@router.get("/communities")
async def get_uae_communities():
    params = {
        "where": "1=1",
        "outFields": "*",
        "returnGeometry": "false",
        "resultRecordCount": 1,
        "f": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                COMMUNITIES_URL,
                params=params,
            )

        response.raise_for_status()

    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve UAE map data.",
        ) from exc

    data = response.json()

    if "error" in data:
        raise HTTPException(
            status_code=502,
            detail=data["error"],
        )

    return {
        "status": "connected",
        "feature_count_returned": len(data.get("features", [])),
        "sample": data.get("features", []),
    }