from models import Base, Attribute


class Review(Base):
    _name = "reviews"
    _search_fields = {"title", "data"}

    network = Attribute(types=int, default=0)
    # TODO: link
    # TODO: executor
    # TODO: category / type : system / custom / ...
