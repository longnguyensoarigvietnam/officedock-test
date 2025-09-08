from faker import Faker
from django.core.management.base import BaseCommand
from mvp_votes.constants import MVPVoteTypes
from mvp_votes.models import MVPVote, MVPVoteManagement


class Command(BaseCommand):
    help = "Seed fake data into Mvp comment"

    def handle(self, *args, **kwargs):
        fake = Faker()
        MVPVote.objects.all().delete()
        mvp_vote_managements = MVPVoteManagement.objects.filter(
            type=MVPVoteTypes.PAST.value
        )
        for mvp_vote_management in mvp_vote_managements:
            voters = mvp_vote_management.company.users.all()
            for voter in voters:
                candidate = mvp_vote_management.mvp_candidates.order_by(
                    "?"
                ).first()
                if (
                    not MVPVote.objects.filter(
                        mvp_vote_management=mvp_vote_management, voter=voter
                    ).exists()
                    and voter != candidate.user
                ):
                    mvp_vote_management.votes.create(
                        company=mvp_vote_management.company,
                        mvp_vote_management=mvp_vote_management,
                        mvp_candidate=candidate,
                        voter=voter,
                        comment=fake.text(max_nb_chars=160),
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded fake data into Mvp vote comments"
            )
        )
