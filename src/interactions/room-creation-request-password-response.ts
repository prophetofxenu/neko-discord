import { submitRoomRequest } from "../neko-do";
import { Context } from "../util";

export default async function roomCreationRequestPasswordResponse(ctx: Context, interaction: any) {
  const channelId = BigInt(interaction.channelId);
  const userId = BigInt(interaction.member.user.id);

  const roomCreationRequest = await ctx.db.RoomCreationRequest.findOne({
    where: {
      channelId: channelId,
      userId: userId
    }
  });
  const password = interaction.fields.components[0].components[0].value;
  const adminPassword = interaction.fields.components[1].components[0].value;
  roomCreationRequest.password = password;
  roomCreationRequest.admin_password = adminPassword;
  await roomCreationRequest.save();

  await interaction.update({
    content: 'Your request is being submitted! This will take 3-5 minutes.',
    components: []
  });

  await submitRoomRequest(ctx, roomCreationRequest);
}
