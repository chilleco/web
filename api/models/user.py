"""
User model of DB object
"""

from models import Base # , Attribute


class User(Base):
    """ User """

    _name = 'users'
