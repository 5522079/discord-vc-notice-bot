import { Bot, createBot, startBot, getBotIdFromToken, Intents, createInvite, editBotStatus } from "@discordeno/mod.ts";
import "$std/dotenv/load.ts";

const token = Deno.env.get("TOKEN");

const bot = createBot({
  token,
  botId: BigInt(getBotIdFromToken(token)),
  intents: Intents.Guilds | Intents.GuildMembers | Intents.GuildVoiceStates,
  events: {
    ready: async (bot, payload) => {
      console.log(`✅ Bot is online!`);
      // ボットのステータスを設定
      editBotStatus(bot, {
        status: "online",
        activities: [
          {
            name: "αテスト",
            type: 1,
          },
        ],
      });
    },

    voiceStateUpdate: async (bot, before, after) => {

      const userId = after?.userId || before?.userId;
      const guildId = after?.guildId || before?.guildId;

      // VC参加時の処理
      if (before?.channelId) {
        if (!voiceStateCache.has(userId)) {
          voiceStateCache.add(userId);
          
          if (voiceStateCache.size === 1) {
            // 最初の一人がVCに参加とき通知を送信
            await sendVoiceJoinNotification(bot, guildId, before.channelId, userId);
          }
        }
      }

      // VC退出時の処理
      if (!before?.channelId && !after?.channelId) {
        if (voiceStateCache.has(userId)) {
          voiceStateCache.delete(userId);
        }

        if (voiceStateCache.size === 0) {
          // 最後の一人がVCを退出したらすべてのキャッシュをクリア
          voiceStateCache.clear();
        }
      }
    },
  },
});

// VCの参加メンバーをキャッシュ
const voiceStateCache = new Set<bigint>();

// VC通知を送る関数
async function sendVoiceJoinNotification(bot: Bot, guildId: bigint, voiceChannel: bigint, userId: bigint) {
  const voiceChannelName = await bot.helpers.getChannel(voiceChannel);
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

  const invite = await createInvite(bot, voiceChannel, { maxUses: 1 });

  if (notifyChannel) {
    await bot.helpers.sendMessage(notifyChannel.id, {
      content: `${username} がVCを開始しました`,
      embeds: [{
        description: `**[${voiceChannelName.name}](https://discord.gg/${invite.code})に参加する \n ${mentions}**`,
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

// ボットを起動
await startBot(bot);

// ボットの常時起動
Deno.cron("Continuous Request", "*/3 * * * *", () => {
    console.log("🔄 Bot is active!");
});
