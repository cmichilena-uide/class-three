from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlmodel import Field as SQLField
from sqlmodel import Session, SQLModel, create_engine, select

DB_URL = "sqlite:///store.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

CATEGORIES = ["laptop", "mouse", "keyboard", "monitor", "headphones"]


class Producto(SQLModel, table=True):
    id: int | None = SQLField(default=None, primary_key=True)
    nombre: str
    descripcion: str
    precio: float
    stock: int
    imagen: str | None = None
    categoria: str = SQLField(index=True)


def create_tables():
    SQLModel.metadata.create_all(engine)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="Tienda UIDE", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


class ProductCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str = Field(min_length=1, max_length=500)
    precio: float = Field(gt=0, le=1_000_000, allow_inf_nan=False)
    stock: int = Field(ge=0, le=1_000_000)
    imagen: str | None = Field(default=None, max_length=500, pattern=r"^https?://\S+$")
    categoria: str

    @field_validator("categoria")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in CATEGORIES:
            raise ValueError(f"Categoría no válida. Opciones: {', '.join(CATEGORIES)}")
        return value


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str
    precio: float
    stock: int
    imagen: str | None
    categoria: str


@app.post(
    "/productos/", status_code=status.HTTP_201_CREATED, response_model=ProductRead
)
def create_product(data: ProductCreate):
    product = Producto(**data.model_dump())
    with Session(engine) as session:
        session.add(product)
        session.commit()
        session.refresh(product)
        return product


@app.get("/productos/", response_model=list[ProductRead])
def list_products():
    with Session(engine) as session:
        return session.exec(select(Producto)).all()


@app.get("/productos/categoria/{category}", response_model=list[ProductRead])
def list_products_by_category(category: str):
    if category not in CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Categoría no válida"
        )
    with Session(engine) as session:
        return session.exec(
            select(Producto).where(Producto.categoria == category)
        ).all()


@app.get("/productos/{id}", response_model=ProductRead)
def get_product(id: int):
    with Session(engine) as session:
        product = session.get(Producto, id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado"
            )
        return product


@app.put("/productos/{id}", response_model=ProductRead)
def update_product(id: int, data: ProductCreate):
    with Session(engine) as session:
        product = session.get(Producto, id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado"
            )
        product.sqlmodel_update(data.model_dump())
        session.add(product)
        session.commit()
        session.refresh(product)
        return product


@app.delete("/productos/{id}")
def delete_product(id: int):
    with Session(engine) as session:
        product = session.get(Producto, id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado"
            )
        session.delete(product)
        session.commit()
        return {"message": "Producto eliminado"}
