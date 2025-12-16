from models import Base, Attribute


class Task(Base):
    """
    colors:
    - green – system
    - violet – our products & networks
    - blue – social & referral
    - orange – monetization & paid

    priorities:
    1000 – initial
    900 – regular system
    800 – our networks
    700 – share & referrals
    650 – upvote us
    600 – partners
    500 – frens & referrals
    """

    _name = "tasks"

    title = Attribute(types=dict)
    data = Attribute(types=dict)
    button = Attribute(types=dict)
    link = Attribute(types=str)
    icon = Attribute(types=str)
    size = Attribute(types=int)
    reward = Attribute(types=int)
    verify = Attribute(types=str)
    params = Attribute(types=dict)
    status = Attribute(types=int, default=1)
    priority = Attribute(types=int, default=0)
    color = Attribute(types=str)
