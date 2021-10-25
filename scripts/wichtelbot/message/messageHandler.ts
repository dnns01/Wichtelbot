import { ChannelType, Message, State } from '../endpoint/definitions';
import { CommandHandlerFunction } from './handlingTools/handlerFunctions';
import { CommandInfo } from '../../utility/localisation';
import Config from '../../utility/config';
import Database from '../database';
import GeneralModule from './modules/generalModule';
import HandlingDefinition from './handlingDefinition';
import InformationModule from './modules/informationModule';
import StateCommand from './handlingTools/stateCommand';
import StateCommandMap from './handlingTools/stateCommandMap';

type CommandMap = Map<string, CommandHandlerFunction>;

// TODO: Documentation
export default class MessageHandler
{
    protected database: Database;

    protected generalModule: GeneralModule;
    protected informationModule: InformationModule;

    // In private messages:
    protected stateCommands = new StateCommandMap();
    // In group/server channels:
    protected publicCommands: CommandMap = new Map<string, CommandHandlerFunction>();
    protected moderatorCommands: CommandMap = new Map<string, CommandHandlerFunction>();
    // Special:
    protected firstContact: CommandHandlerFunction = async (message): Promise<void> => this.generalModule.firstContact(message);
    protected messageNotUnterstood = async (message: Message, availableCommands: CommandInfo[]): Promise<void> =>
        this.generalModule.notUnderstood(message, availableCommands);

    /**
     * The handling definition is an object-based representation of the state/command handling structure.
     */
    public readonly handlingDefinition: HandlingDefinition;

    /**
     * Containts a list of commands for every state.
     * This allows us to determine which commands could be executed in the current state.
     */
    protected commandListsForEveryState = new Map<State, CommandInfo[]>();

    constructor (database: Database)
    {
        this.database = database;

        this.generalModule = new GeneralModule(database);
        this.informationModule = new InformationModule(database);

        this.handlingDefinition = new HandlingDefinition(this.generalModule, this.informationModule);

        this.applyHandlingDefinition();
    }

    /**
     * Applies the handling definition by inserting the specifications into the usable map structure.
     */
    protected applyHandlingDefinition (): void
    {
        // State commands:
        for (const stateCommandDefinition of this.handlingDefinition.stateCommands)
        {
            if (stateCommandDefinition.paths === null)
            {
                const stateCommand = new StateCommand(stateCommandDefinition.state, '');

                this.stateCommands.set(stateCommand, stateCommandDefinition.handlerFunction);
            }
            else
            {
                for (const path of stateCommandDefinition.paths)
                {
                    this.prepareCommandInfo(path.command,
                        (command: string): void =>
                        {
                            const stateCommand = new StateCommand(stateCommandDefinition.state, command);

                            this.stateCommands.set(
                                stateCommand,
                                async (message) => stateCommandDefinition.handlerFunction(message, path.result)
                            );
                        }
                    );
                }
            }
        }

        // Public commands:
        for (const commandDefinition of this.handlingDefinition.publicCommands)
        {
            this.prepareCommandInfo(commandDefinition.commandInfo,
                (command: string): void =>
                {
                    this.publicCommands.set(command, commandDefinition.handlerFunction);
                }
            );
        }

        // Moderation commands:
        for (const commandDefinition of this.handlingDefinition.moderatorCommands)
        {
            this.prepareCommandInfo(commandDefinition.commandInfo,
                (command: string): void =>
                {
                    this.moderatorCommands.set(command, commandDefinition.handlerFunction);
                }
            );
        }
    }

    /**
     * Prepares a single command info by converting it as needed and setting externalities. \
     * The applying of the command must be done by the caller via the apply callback.
     * @param commandInfo The command info to prepare.
     * @param apply A callback called for every command to apply.
     */
    protected prepareCommandInfo (commandInfo: CommandInfo, apply: (command: string) => void): void
    {
        for (let command of commandInfo.commands)
        {
            command = command.toLocaleLowerCase();

            apply(command);
        }
    }

    /**
     * Tries to find a state command and returns if it has been called.
     * @param stateCommand The state command to search for.
     * @param message The message to call the command with.
     * @return True if the state command has been found and called.
     */
    protected async tryToCallStateCommand (stateCommand: StateCommand, message: Message): Promise<boolean>
    {
        if (this.stateCommands.has(stateCommand))
        {
            // There is a function available for this specific state command combination.
            const messageFunction = this.stateCommands.get(stateCommand);
            await messageFunction(message);

            return true;
        }
        else
        {
            return false;
        }
    }

    public async process (message: Message): Promise<void>
    {
        if (message.author.isBot)
        {
            // We will not process messages from bots like ourself.
            // Prevents bot ping pong...
            return;
        }

        if (message.channel.type == ChannelType.Server)
        {
            if (!message.content.startsWith(Config.main.commandPrefix))
            {
                // We ignore messages on servers that do not start with the defined message prefix.
                return;
            }

            let messageFunction: CommandHandlerFunction | undefined;

            if (Config.main.moderationChannelIds.includes(message.channel.id))
            {
                // Moderation:
                messageFunction = this.moderatorCommands.get(message.command);
            }
            else
            {
                // Public commands (probably contacting):
                messageFunction = this.publicCommands.get(message.command);
            }

            if (messageFunction !== undefined)
            {
                this.database.log(message.author.id, message.author.tag, message.content, message.channel.id);

                await messageFunction(message);
            }
        }
        else if (message.channel.type == ChannelType.Personal)
        {
            this.database.log(message.author.id, message.author.tag, message.content);

            if (this.database.hasContact(message.author.id))
            {
                const contact = this.database.getContact(message.author.id);

                // NOTE: In personal channels, we do not use the "command/parameters" concept because it is much more natural
                //       to speak with the bot in words and sentences. Therefor we use the message content. If we have to
                //       make inputs, we use catch all commands to save the full input.
                //       Short: Instead of <"command parameters"> we use <stateA: "command", stateB: "parameters">.
                message.hasParameters = false;

                if (! await this.tryToCallStateCommand(new StateCommand(contact.state, ''), message) && // Catch all
                    ! await this.tryToCallStateCommand(new StateCommand(contact.state, message.command), message) && // Specific state command
                    ! await this.tryToCallStateCommand(new StateCommand(State.Nothing, message.command), message)) // Stateless command
                {
                    // No function found.

                    let availableStateCommands = this.commandListsForEveryState.get(contact.state);
                    if (availableStateCommands === undefined)
                    {
                        availableStateCommands = [];
                    }

                    let availableStatelessCommands = this.commandListsForEveryState.get(State.Nothing);
                    if (availableStatelessCommands === undefined)
                    {
                        availableStatelessCommands = [];
                    }

                    const availableCommands = availableStateCommands.concat(availableStatelessCommands);

                    await this.messageNotUnterstood(message, availableCommands);
                }
            }
            else
            {
                // First contact:
                await this.firstContact(message);
            }
        }
        else
        {
            // We must ignore channels of type "Ignore".
            return;
        }
    }
}
