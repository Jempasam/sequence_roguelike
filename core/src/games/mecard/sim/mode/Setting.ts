import { Fault } from "../../../../engine/net/Fault"

/** What a setting is worth: a choice among names, or a number. */
export type SettingValue = string|number

/** What each setting of a mode is worth, by the id of the setting. */
export type SettingValues = Readonly<Record<string, SettingValue>>

/** A value was given to a setting that does not take it. */
export class InvalidSettingFault extends Fault {


    constructor(
        /** The id of the setting. */
        public readonly setting: string,

        /** What is wrong with the value. */
        public readonly detail: string,

        public readonly who: string|null = null,
    ){
        super()
    }


    public describe(): string {
        return `The setting ${this.setting} cannot take this value: ${this.detail}`
    }
}

/** What shows or reads a setting, so the sim knows no widget. */
export interface SettingVisitor<T> {
    choice(setting: ChoiceSetting): T
    range(setting: RangeSetting): T
}

/** A thing a mode lets the players set before it starts. */
export abstract class Setting {


    constructor(
        /** What tells it from the other settings of its mode. */
        public readonly id: string,

        /** What it is called to the players. */
        public readonly label: string,
    ){}


    /** What it is worth until someone changes it. */
    public abstract get initial(): SettingValue

    /** Why the value is not one it takes, none when it is. */
    public abstract check(value: unknown): Fault|null

    /** Have a visitor deal with the kind of setting this is. */
    public abstract accept<T>(visitor: SettingVisitor<T>): T
}

/** A setting that is one name among a few. */
export class ChoiceSetting extends Setting {


    constructor(
        id: string,
        label: string,

        /** The names it takes, the first of which it is worth until changed. */
        public readonly values: readonly string[],
    ){
        super(id, label)
        if(values.length === 0) throw new Error(`The setting ${id} takes no value.`)
    }


    public get initial(): string { return this.values[0] }

    public check(value: unknown): Fault|null {
        if(typeof value === "string" && this.values.includes(value)) return null
        return new InvalidSettingFault(this.id, `one of ${this.values.join(", ")} was expected`)
    }

    public accept<T>(visitor: SettingVisitor<T>): T { return visitor.choice(this) }
}

/** A setting that is a whole number between two bounds, by steps. */
export class RangeSetting extends Setting {


    constructor(
        id: string,
        label: string,
        public readonly min: number,
        public readonly max: number,
        public readonly step: number,
        public readonly initial: number,
    ){
        super(id, label)
        if(!(min <= initial && initial <= max && step > 0)) throw new Error(`The setting ${id} is not well made.`)
    }


    public check(value: unknown): Fault|null {
        const inRange = typeof value === "number" && Number.isInteger(value) && this.min <= value && value <= this.max
        if(inRange && (value - this.min) % this.step === 0) return null
        return new InvalidSettingFault(this.id, `a number from ${this.min} to ${this.max} by ${this.step} was expected`)
    }

    public accept<T>(visitor: SettingVisitor<T>): T { return visitor.range(this) }
}

/** The values a list of settings has until they are changed. */
export function initialValues(settings: readonly Setting[]): SettingValues {
    return Object.fromEntries(settings.map(setting => [setting.id, setting.initial]))
}

/** Why a set of values does not fit the settings, none when it does: no missing, unknown or wrong value. */
export function checkValues(settings: readonly Setting[], values: SettingValues): Fault|null {
    for(const setting of settings){
        const fault = setting.check(values[setting.id])
        if(fault) return fault
    }
    for(const id of Object.keys(values)){
        if(!settings.some(setting => setting.id === id)) return new InvalidSettingFault(id, "no such setting")
    }
    return null
}
