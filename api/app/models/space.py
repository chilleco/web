from models import Base, Attribute


class Space(Base):
    _name = "spaces"
    _search_fields = {
        "title",
        "description",
        "mail",
        "telegram",
        "country",
        "region",
        "city",
    }

    title = Attribute(types=str)
    link = Attribute(types=str)
    logo = Attribute(types=str)
    description = Attribute(types=str, default="")
    entity = Attribute(types=str)
    director = Attribute(types=str)
    inn = Attribute(types=str)
    margin = Attribute(types=float, default=0.0)
    phone = Attribute(types=str)
    mail = Attribute(types=str)
    telegram = Attribute(types=str)
    country = Attribute(types=str)
    region = Attribute(types=str)
    city = Attribute(types=str)
    users = Attribute(types=list, default=list)
    user = Attribute(types=int)
    token = Attribute(types=str)
    status = Attribute(types=int, default=1)
