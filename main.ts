import { Bot, createBot, startBot, getBotIdFromToken, Intents, createInvite, editBotStatus } from "@discordeno/mod.ts";
import "$std/dotenv/load.ts";

const token = Deno.env.get("TOKEN");

const bot = createBot({
  token,
  botId: BigInt(getBotIdFromToken(token)),
  intents: Intents.Guilds | Intents.GuildMembers | Intents.GuildVoiceStates,
  events: {
    ready: async (bot, payload) => {
      console.log("✅ Bot is online!");
      console.log(`🔎 ${vcMemberCache.size} members are in the VC`);
      try {
        await editBotStatus(bot, {
          status: "online",
          activities: [{ name: "αテスト", type: 1 }], // ボットのステータスを設定
        });
      } catch (error) {
        console.error("❌ Bot startup error!:", error);
      }
    },

    voiceStateUpdate: async (bot, before, after) => {

      const userId = after?.userId || before?.userId;
      const guildId = after?.guildId || before?.guildId;

      // VC参加時の処理
      if (before?.channelId) {
        if (!vcMemberCache.has(userId)) {
          vcMemberCache.add(userId);

          console.log(`🔥 ${"*".repeat(2) + userId.toString().slice(16)} joined the ${"*".repeat(2) + before.channelId.toString().slice(16)}`);

          if (vcMemberCache.size === 1) {
            // 最初の一人がVCに参加とき通知を送信
            await sendNotification(bot, guildId, before.channelId, userId);
          } else {

          }
        }
      }

      // VC退出時の処理
      if (!before?.channelId && !after?.channelId) {
        if (vcMemberCache.has(userId)) {
          console.log(`🔥 ${"*".repeat(2) + userId.toString().slice(16)} exits`);
          vcMemberCache.delete(userId);
        }

        if (vcMemberCache.size === 0) {
          console.log(`🧹 Clear cache`);
          // 最後の一人がVCを退出したらすべてのキャッシュをクリア
          vcMemberCache.clear();
        }
      }
    },
  },
});

// VCの参加メンバーをキャッシュ
let vcMemberCache = new Set<bigint>();

// VC通知を送る関数
async function sendNotification(bot: Bot, guildId: bigint, voiceChannelId: bigint, userId: bigint) {
  const voiceChannel = await bot.helpers.getChannel(voiceChannelId);
  const member = await bot.helpers.getMember(guildId, userId).catch(() => null);
  const username = member?.nick || member?.user.username;

  const nonBotMembers = await getNonBotMembers(bot, guildId);
  const membersNotInChannel = nonBotMembers.filter(m => m.user.id !== userId);
  const mentions = membersNotInChannel.map(m => `<@${m.user.id}>`).join(" ");

  const avatarUrl = member?.user.avatar
    ? `https://cdn.discordapp.com/avatars/${String(userId)}/${member.user.avatar.toString(16).slice(1)}.png`
    : `https://cdn.discordapp.com/embed/avatars/${Number(member?.user.discriminator) % 5}.png`;

  const channels = await bot.helpers.getChannels(guildId);
  const notifyChannel = channels.find(c => c.name === "通知"); //"通知"チャンネルを指定

  const invite = await createInvite(bot, voiceChannelId, { maxUses: 1 });

  if (notifyChannel) {
    await bot.helpers.sendMessage(notifyChannel.id, {
      content: `${username} がVCを開始しました`,
      embeds: [{
        description: `**[${voiceChannel.name}](https://discord.gg/${invite.code})に参加する \n ${mentions}**`,
        color: 0x5865F2,
        thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
        timestamp: new Date().toISOString(),
      }],
    });
  }
}

// "BOT"ロールを持たないメンバーを取得
async function getNonBotMembers(bot: Bot, guildId: bigint) {
  const roles = await bot.helpers.getRoles(guildId);
  const botRole = roles.find(role => role.name === "BOT");
  const members = await bot.helpers.getMembers(guildId, { limit: 1000 });

  return Array.from(members.values()).filter(member => !botRole || !member.roles.includes(botRole.id));
}

// ボットの常時起動
//Deno.cron("Continuous Request", "*/2 * * * *", () => {
//    console.log(`🔎 ${vcMemberCache.size} members are in the VC`);
//    console.log("🔄 Bot is active!");
//});

// ボットを起動
try {
  await startBot(bot);
} catch (error) {
  console.error("❌ Bot startup error!:", error);
}
