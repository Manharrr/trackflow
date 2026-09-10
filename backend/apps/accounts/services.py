from .models import User


class UserService:

    @staticmethod
    def get_user_by_email(
        email,
    ):

        try:

            return User.objects.get(
                email=email
            )

        except User.DoesNotExist:

            return None


    @staticmethod
    def get_user_by_phone(
        phone,
    ):

        try:

            return User.objects.get(
                phone=phone
            )

        except User.DoesNotExist:

            return None


    @staticmethod
    def verify_phone(
        user,
    ):

        user.phone_verified = True

        user.save(
            update_fields=[
                "phone_verified"
            ]
        )

        return user
    
    # late we need to add this
# block_user()
# activate_user()
# deactivate_user()
# change_role()