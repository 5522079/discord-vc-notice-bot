from discord.ext import commands
import discord
from datetime import datetime


intents = discord.Intents.default()
intents.voice_states = True  # ボイスチャンネルの状態変化を検知する
intents.guilds = True
intents.members = True  # メンバー管理の権限

bot = commands.Bot(
    command_prefix="!", 
    intents=intents
)

@bot.event
async def on_ready():
    print(f"Bot is ready!")

@bot.event
async def on_voice_state_update(member, before, after):
    if before.channel is None and after.channel is not None:
        voice_channel = after.channel  # 参加したボイスチャンネル
        guild = member.guild
        members_in_vc = {m for m in voice_channel.members if not m.bot}

        if len(members_in_vc) == 1:
            text_channel = discord.utils.get(guild.text_channels, name="通知")  # テキストチャンネル指定
            if text_channel:
                # VCにいないメンバーをリストアップ
                not_in_vc_members = [m for m in guild.members if not m.bot and m not in members_in_vc]
                
                # メンションを作成
                mentions = " ".join(m.mention for m in not_in_vc_members)

                # Embed メッセージの作成
                embed = discord.Embed(
                    title=f"**{member.display_name} がVCを開始しました**",
                    description=f"{mentions}",
                    color=discord.Color.blue(),
                )
                embed.set_footer(text=f"{datetime.now().strftime('%Y/%m/%d %H:%M')}")
                embed.set_thumbnail(url=member.avatar.url if member.avatar else member.default_avatar.url)

                # メッセージ送信
                await text_channel.send(embed=embed)

bot.run(TOKEN)
