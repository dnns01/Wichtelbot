import * as fs from 'fs';

import Config from './config';
import GiftType from '../wichtelbot/types/giftType';
import TokenString from './tokenString';
import WichtelEventPhase from './wichtelEvent';

export interface CommandInfo
{
    commands: string[];
    info: string | undefined;
}

interface Commands
{
    callMods: CommandInfo;
    changeInformation: CommandInfo;
    contacting: CommandInfo;
    deregistration: CommandInfo;
    goodAfternoon: CommandInfo;
    goodEvening: CommandInfo;
    goodMorning: CommandInfo;
    goodNight: CommandInfo;
    hello: CommandInfo;
    help: CommandInfo;
    informationAnalogue: CommandInfo;
    informationBothAnalogueAndDigital: CommandInfo;
    informationDigital: CommandInfo;
    maybe: CommandInfo;
    moddingDistributeWichtelProfiles: CommandInfo;
    moddingEndRegistration: CommandInfo;
    moddingRunAssignment: CommandInfo; // TODO: Rename "modding" commands to "moderation".
    moddingStatus: CommandInfo;
    no: CommandInfo;
    registration: CommandInfo;
    sternenrose: CommandInfo;
    thankYou: CommandInfo;
    writeOwnGiftGiver: CommandInfo;
    writeOwnGiftTaker: CommandInfo;
    yes: CommandInfo;
    yourAreWelcome: CommandInfo;
}

// TODO: Documentation
interface Texts
{
    assignmentError: TokenString;
    assignmentSuccessful: TokenString;
    becameMember: TokenString;
    changedInformation: TokenString;
    commandInfo: TokenString;
    confirmDeregistration: TokenString;
    contactingFailedResponse: TokenString;
    contactingTooEarly: TokenString;
    contactingRegistration: TokenString;
    contactingResponse: TokenString;
    contactingAlreadyRegistered: TokenString;
    contactingTooLate: TokenString;
    contactingWhileRegistration: TokenString;
    countrySelectPlaceholder: TokenString;
    deregistration: TokenString;
    deregistrationCancelled: TokenString;
    goodAfternoon: TokenString;
    goodEvening: TokenString;
    goodMorning: TokenString;
    goodNight: TokenString;
    hello: TokenString;
    helpText: TokenString;
    informationAddress: TokenString;
    informationAllergies: TokenString;
    informationCountry: TokenString;
    informationDigitalAddress: TokenString;
    informationFreeText: TokenString;
    informationGiftExclusion: TokenString;
    informationGiftTypeAsGiver: TokenString;
    informationGiftTypeAsTaker: TokenString;
    informationInternationalAllowed: TokenString;
    informationUserExclusion: TokenString;
    informationWishList: TokenString;
    maybeResponse: TokenString;
    messageTooLong: TokenString;
    noCommandsAvailable: TokenString;
    notUnderstood: TokenString;
    oldInformation: TokenString;
    messageFromGiftGiverOrTaker: TokenString;
    messageFromGiftGiverHeadline: TokenString;
    messageFromGiftTakerHeadline: TokenString;
    messageToGiftGiverOrTakerSent: TokenString;
    moderationNeedHelp: TokenString; // TODO: This includes a Discord specific mention which is not portable to other implementations.
    moderationRegistrationEnded: TokenString;
    moderationProfilesDistributed: TokenString;
    moderationStatus: TokenString;
    moderationStatusEventPhase: TokenString;
    moderationStatusEventPhaseWithNextPhase: TokenString;
    modsCalled: TokenString;
    profileName: TokenString;
    profileGiftType: TokenString;
    profileCounty: TokenString;
    profileAddress: TokenString;
    profileDigitalAddress: TokenString;
    profileWishlist: TokenString;
    profileAllergies: TokenString;
    profileExclusion: TokenString;
    profileFreeText: TokenString;
    registration: TokenString;
    registrationCancelled: TokenString;
    registrationProfileOverview: TokenString;
    sentComponentText: TokenString;
    sternenrose: TokenString;
    thankYouResponse: TokenString;
    wichtelProfileDistribution: TokenString;
    writeOwnGiftGiver: TokenString;
    writeOwnGiftTaker: TokenString;
    yourAreWelcomeRespone: TokenString;
}

interface Values
{
    giftTypeAnalogue: string;
    giftTypeDigital: string;
    giftTypeAll: string;
    giftTypeNothing: string;
    no: string;
    yes: string;
    wichtelEventPhaseEnded: string,
    wichtelEventPhaseRegistration: string,
    wichtelEventPhaseWaiting: string,
    wichtelEventPhaseWichteln: string,
}

export default abstract class Localisation
{
    private static commandsPath = './locale/' + Config.main.locale + '.commands.json';
    private static textsPath = './locale/' + Config.main.locale + '.texts.json';
    private static valuesPath = './locale/' + Config.main.locale + '.values.json';

    private static _commands = JSON.parse(fs.readFileSync(Localisation.commandsPath, 'utf8')) as Commands;
    private static _texts = JSON.parse(fs.readFileSync(Localisation.textsPath, 'utf8'),
        /**
         * A reviver for the JSON.parse function to convert strings into TokenString.
         */
        function (this: any, _key: string, value: string): any
        {
            if ((typeof value) === 'string')
            {
                const tokenString = new TokenString(value);

                return tokenString;
            }
            else
            {
                return value;
            }
        }
    ) as Texts;
    private static _values = JSON.parse(fs.readFileSync(Localisation.valuesPath, 'utf8')) as Values;

    public static get commands (): Commands
    {
        return Localisation._commands;
    }

    public static get texts (): Texts
    {
        return Localisation._texts;
    }

    public static get values (): Values
    {
        return Localisation._values;
    }

    public static translateBoolean (value: boolean): string
    {
        const result = value ? Localisation._values.yes : Localisation._values.no;

        return result;
    }

    public static translateGiftType (giftType: GiftType): string
    {
        switch (giftType)
        {
            case GiftType.Analogue:
                return Localisation._values.giftTypeAnalogue;
            case GiftType.Digital:
                return Localisation._values.giftTypeDigital;
            case GiftType.All:
                return Localisation._values.giftTypeAll;
            case GiftType.Nothing:
                return Localisation._values.giftTypeNothing;
            default:
                throw TypeError('Invalid gift type to translate.');
        }
    }

    public static translateCountry (country: string): string
    {
        // NOTE: The countries are already in the local language all over the database. Technically, this only corrects the capitalisation.

        const indexOfCountry = Config.main.allowedCountries.indexOf(country);
        const localisedCountry = Config.rawCountries[indexOfCountry];

        return localisedCountry;
    }

    public static translateWichtelEventPhase (eventPhase: WichtelEventPhase): string
    {
        switch (eventPhase)
        {
            case WichtelEventPhase.Waiting:
                return Localisation._values.wichtelEventPhaseWaiting;
            case WichtelEventPhase.Registration:
                return Localisation._values.wichtelEventPhaseRegistration;
            case WichtelEventPhase.Wichteln:
                return Localisation._values.wichtelEventPhaseWichteln;
            case WichtelEventPhase.Ended:
                return Localisation._values.wichtelEventPhaseEnded;
            default:
                throw TypeError('Invalid event phase to translate.');
        }
    }
}
