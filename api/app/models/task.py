from models import Base, Attribute


class Task(Base):
    _name = "tasks"
    _search_fields = {"title", "description", "category"}

    title = Attribute(types=str)
    description = Attribute(types=str, default="")
    category = Attribute(types=str, default="daily")
    icon = Attribute(types=str)
    reward_label = Attribute(types=str, default="")
    reward_value = Attribute(types=float)
    reward_unit = Attribute(types=str)
    progress_current = Attribute(types=int, default=0)
    progress_target = Attribute(types=int, default=1)
    state = Attribute(types=str, default="in_progress")  # in_progress | ready | claimed
    action = Attribute(types=str, default="start")  # start | claim
    link = Attribute(types=str)
    order = Attribute(types=int, default=0)
    status = Attribute(types=int, default=1)
    token = Attribute(types=str, default="")
    locale = Attribute(types=str)
