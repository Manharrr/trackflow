from rest_framework import serializers

from .models import Client


class CompanySerializer(serializers.ModelSerializer):
     
    admin_name = serializers.SerializerMethodField()

    class Meta:
        model = Client

        fields = [
            'id',
            'name',
            'schema_name',
            'phone',
            'email',
            'status',
            'logo',
            'address',
            'description',
            'created_at',
            'admin_name',
        ]
    def get_admin_name(
        self,
        obj
    ):
        from apps.accounts.models import User

        user = User.objects.filter(
            email=obj.email
        ).first()

        if user:
            return user.username

        return ""