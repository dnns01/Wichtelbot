import * as Discord from 'discord.js';
import { Component, Message } from '../../definitions';
import Config from '../../../../utility/config';
import { DiscordChannel } from './discordChannel';
import { DiscordClient } from './discordClient';
import { DiscordUser } from './discordUser';
import { DiscordUtils } from './discordUtils';
import { MessageWithParser } from '../../base/messageWithParser';
import Utils from '../../../../utility/utils';

/**
 * This class maps a Discord interaction to the WichtelBot message interface.
 */
export class DiscordInteraction extends MessageWithParser implements Message
{
    private interaction: Discord.Interaction;
    private responsibleClient: DiscordClient;

    constructor (interaction: Discord.Interaction, responsibleClient: DiscordClient)
    {
        super();

        if (interaction.type !== 'APPLICATION_COMMAND' && interaction.type !== 'MESSAGE_COMPONENT')
        {
            throw new Error('The interaction is not a message type.');
        }

        this.interaction = interaction;
        this.responsibleClient = responsibleClient;

        this.hasParameters = false;
    }

    public get author (): DiscordUser
    {
        const author = new DiscordUser(this.interaction.user);

        return author;
    }

    public get channel (): DiscordChannel
    {
        if (this.interaction.channel === null)
        {
            throw new Error('The interaction channel is null.');
            // TODO: What should/can we do here?
        }

        const channel = new DiscordChannel(this.interaction.channel);

        return channel;
    }

    public get client (): DiscordClient
    {
        return this.responsibleClient;
    }

    public get content (): string
    {
        let content: string;

        if (this.interaction.isButton()
        || this.interaction.isMessageComponent()
        || this.interaction.isSelectMenu())
        {
            content = this.interaction.customId;
        }
        else if (this.interaction.isCommand()
            ||this.interaction.isContextMenu())
        {
            content = this.interaction.commandName;

            // TODO: The parameters are missing.
        }
        else
        {
            throw new Error('Unknown interaction type');
        }

        return Config.main.commandPrefix + content;
    }

    /**
     * Defer the reply to prevent a timeout after three seconds. \
     * Must be called as soon as possible and before reply is called.
     */
    public async defer (): Promise<void>
    {
        if (this.interaction.isButton()
        || this.interaction.isMessageComponent()
        || this.interaction.isSelectMenu())
        {
            await this.interaction.deferUpdate();
        }
        else if (this.interaction.isCommand()
        || this.interaction.isContextMenu())
        {
            await this.interaction.deferReply();
        }
        else
        {
            throw new Error('Unknown interaction type');
        }
    }

    public async reply (text: string, components?: Component[], imageUrl?: string): Promise<void>
    {
        const splittetText = Utils.splitTextNaturally(text, DiscordUtils.maxMessageWithMentionLength);

        if (this.interaction.isButton()
            || this.interaction.isMessageComponent()
            || this.interaction.isSelectMenu())
        {
            const actionRow = new Discord.MessageActionRow();
            const messageButton = new Discord.MessageButton();
            messageButton.setLabel(this.interaction.customId);
            messageButton.setCustomId(this.interaction.customId);
            messageButton.setStyle('PRIMARY');
            messageButton.setDisabled(true);
            actionRow.addComponents(messageButton);

            await this.interaction.update(
                {
                    content: this.interaction.message.content,
                    components: [actionRow],
                }
            );

            await DiscordUtils.sendMultiMessage(this.interaction.followUp.bind(this.interaction), splittetText, components, imageUrl);
        }
        else if (this.interaction.isCommand()
            || this.interaction.isContextMenu())
        {
            await DiscordUtils.sendMultiMessage(this.interaction.editReply.bind(this.interaction), splittetText, components, imageUrl);
        }
        else
        {
            throw new Error('Unknown interaction type');
        }
    }
}
