from models.account import AccountRecord
from models.recommendation import RecommendationRecord
from services.scoring import score_account


def evaluate_accounts(accounts: list[AccountRecord]) -> list[RecommendationRecord]:
    return [score_account(account) for account in accounts]
