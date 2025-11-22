from models import Base, Attribute


class System(Base):
    _name = "system"

    id = Attribute(types=str)
    data = Attribute()
