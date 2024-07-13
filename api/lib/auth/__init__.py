import jwt
from consys.errors import ErrorInvalid


async def jwt_auth(jwt_secret, token):
    if not token or token == "null":
        raise ErrorInvalid("token")

    token = jwt.decode(token, jwt_secret, algorithms="HS256")

    return (
        token["token"],
        token.get("user", 0),
        token.get("status", 3),
        token.get("network", 0),
    )
