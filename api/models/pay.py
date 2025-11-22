from models import Base, Attribute


class Pay(Base):
    _name = "pays"

    # type = Attribute(types=str)
    # card = Attribute(types=dict)
    # frequency = Attribute(types=int, default=30)  # Days
    # value = Attribute(types=int)прст
    # discount = Attribute(types=float)

    nominal_amount = Attribute(types=float)
    nominal_currency = Attribute(types=str)
    real_amount = Attribute(types=float)
    real_currency = Attribute(types=str)
    payload = Attribute(types=str)
    provider = Attribute(types=str)
    status = Attribute(types=int, default=1)
    products = Attribute(types=list)
    extra = Attribute(types=dict)
