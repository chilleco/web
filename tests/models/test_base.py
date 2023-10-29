import pytest
from libdev.gen import generate
from consys.errors import ErrorWrong

from models.post import Post


def test_base():
    post = Post(title=generate())
    post.save()
    assert post.id

    with pytest.raises(ErrorWrong):
        Post.get(999)
