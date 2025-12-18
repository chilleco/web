from models import Base, Attribute


class Feedback(Base):
    _name = "feedback"
    _search_fields = {"title", "data", "type", "source"}

    token = Attribute(types=str)
    network = Attribute(types=int, default=0)
    user_status = Attribute(types=int, default=3)

    type = Attribute(types=str, default="question")
    source = Attribute(types=str)
    files = Attribute(types=list, default=list)

