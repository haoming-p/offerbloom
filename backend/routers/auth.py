import uuid
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from neo4j import Session

from database import get_db
from models.user import UserRegister, UserLogin, UserOut, TokenResponse
from auth.password import hash_password, verify_password
from auth.jwt import create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    # Check if email already exists
    result = db.run("MATCH (u:User {email: $email}) RETURN u", email=data.email)
    if result.single():
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    db.run(
        """
        CREATE (u:User {id: $id, name: $name, email: $email, password: $password})
        """,
        id=user_id,
        name=data.name,
        email=data.email,
        password=hash_password(data.password),
    )

    token = create_access_token({"sub": user_id, "email": data.email})
    user = UserOut(id=user_id, name=data.name, email=data.email)
    return TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    result = db.run("MATCH (u:User {email: $email}) RETURN u", email=data.email)
    record = result.single()

    if not record:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_node = record["u"]

    if not verify_password(data.password, user_node["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user_node["id"], "email": user_node["email"]})
    user = UserOut(id=user_node["id"], name=user_node["name"], email=user_node["email"])
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = db.run("MATCH (u:User {id: $id}) RETURN u", id=payload["sub"])
    record = result.single()

    if not record:
        raise HTTPException(status_code=404, detail="User not found")

    user_node = record["u"]
    return UserOut(id=user_node["id"], name=user_node["name"], email=user_node["email"])
