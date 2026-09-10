from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(
    AsyncJsonWebsocketConsumer
):

    async def connect(self):
        self.tenant = self.scope.get("tenant")
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated or not self.tenant:
            await self.close()
            return

        self.group_name = (
            f"notifications_{self.tenant.id}_{self.user.id}"
        )

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )

        await self.accept()

    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name,
        )

    async def notification_message(self, event):

        await self.send_json(
            {
                "type": "notification",
                "data": event["notification"],
            }
        )