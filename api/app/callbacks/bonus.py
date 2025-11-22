from callbacks import Callback

# import tasks
# from tasks import bonus_referrer


FRENS_BONUS = 10000


class BonusReferrer(Callback):
    def validate(self):
        if self.old or not self.new:
            return False
        if not self.entity.referrer:
            return False
        return True

    def _execute(self):
        referrer = self.entity.get(self.entity.referrer)
        referrer.balance += FRENS_BONUS
        referrer.save()
        # tasks.bonus_referrer.send(referrer, self.entity)
