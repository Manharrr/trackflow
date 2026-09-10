import os

from google.auth.transport import requests
from google.oauth2 import id_token


GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID"
)


def verify_google_token(
    token
):

    try:

        user_info = (
            id_token.verify_oauth2_token(
                token,
                requests.Request(),
                GOOGLE_CLIENT_ID,
            )
        )

        return {
            "success": True,
            "email": user_info.get(
                "email"
            ),
            "name": user_info.get(
                "name"
            ),
            "picture": user_info.get(
                "picture"
            ),
            "sub": user_info.get(
                "sub"
            ),
        }

    except Exception as e:

        print(
            "GOOGLE ERROR:",
            str(e) 
        )

        return {
            "success": False,
            "error": str(e),
        }
