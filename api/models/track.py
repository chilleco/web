from models import Base, Attribute


class Track(Base):
    _name = "tracking"

    data = Attribute(types=dict)
    context = Attribute(default=dict)
    token = Attribute(types=str)
    ip = Attribute(types=str)
