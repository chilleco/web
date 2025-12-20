from tasks.event_base import EventHandler
from tasks.event_registry import on_change

# import tasks
# from tasks import bonus_referrer


FRENS_BONUS = 10000


@on_change(model="users", field="referrer")
class BonusReferrer(EventHandler):
    async def validate(self):
        if self.old or not self.new:
            return False
        if not self.entity.referrer:
            return False
        return True

    async def _execute(self):
        referrer = self.entity.get(self.entity.referrer)
        referrer.balance += FRENS_BONUS
        referrer.save()
        # tasks.bonus_referrer.send(referrer, self.entity)
