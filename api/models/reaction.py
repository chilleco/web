from models import Base, Attribute


class Reaction(Base):
    _name = "reactions"

    type = Attribute(types=str, default="view")
    post = Attribute(types=int)
    token = Attribute(types=str)
    utm = Attribute(types=str)
