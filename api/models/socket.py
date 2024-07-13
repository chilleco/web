from models import Base, Attribute


class Socket(Base):
    _name = "sockets"

    id = Attribute(types=str)
    token = Attribute(types=str)
