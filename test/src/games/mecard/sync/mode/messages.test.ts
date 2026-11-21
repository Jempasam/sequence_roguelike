import {
    ACT_TOPIC, ANSWER_TOPIC, ASK_TOPIC, CLOSE_TOPIC, FOLLOW_TOPIC, OPEN_RUN_TOPIC, ORDER_TOPIC,
    REPLY_TOPIC, ROUTE_ASK_TOPIC, ROUTE_TOPIC, STATE_TOPIC, UNFOLLOW_TOPIC, instanceTopic, readActMessage,
    readAnswerMessage, readAskMessage, readIdMessage, readOpenMessage, readOrderMessage, readReplyMessage,
    readRouteAskMessage, readRouteMessage, readStateMessage, upTopic, write,
} from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { expectNoneOf } from "../messageFixtures"

describe("mode topics", () => {
    test("instance and up topics → named by the id, and told apart", () => {
        expect(instanceTopic(3).name).toBe("i3")
        expect(upTopic(3).name).toBe("u3")
        expect(instanceTopic(3).name).not.toBe(upTopic(3).name)
        expect(instanceTopic(3).name).not.toBe(instanceTopic(4).name)
    })

    test("fixed topics → all distinct", () => {
        const names = [
            ACT_TOPIC, ANSWER_TOPIC, ASK_TOPIC, CLOSE_TOPIC, FOLLOW_TOPIC, OPEN_RUN_TOPIC, ORDER_TOPIC,
            REPLY_TOPIC, ROUTE_ASK_TOPIC, ROUTE_TOPIC, STATE_TOPIC, UNFOLLOW_TOPIC,
        ].map(topic => topic.name)
        expect(new Set(names).size).toBe(names.length)
    })
})

describe("Open message", () => {
    test("written → read back with its spec and info", () => {
        const message = { id: 2, spec: { seed: 5 }, own: true, info: "x" }
        expect(readOpenMessage(OPEN_RUN_TOPIC, write(message))).toEqual(message)
    })

    test("no info → read as null, and a spec that is absent stays absent", () => {
        expect(readOpenMessage(OPEN_RUN_TOPIC, write({ id: 2, own: false }))).toEqual({
            id: 2, spec: undefined, own: false, info: null,
        })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(text => readOpenMessage(OPEN_RUN_TOPIC, text), [
            "{}", "{\"id\":1}", "{\"own\":true}", "{\"id\":\"1\",\"own\":true}", "{\"id\":1,\"own\":1}",
        ])
    })

    test("unreadable → the fault names the topic it came on", () => {
        const read = readOpenMessage(OPEN_RUN_TOPIC, "{}")
        expect(read).toMatchObject({ topic: OPEN_RUN_TOPIC.name })
    })
})

describe("Id message", () => {
    test("written → read back the id only", () => {
        expect(readIdMessage(CLOSE_TOPIC, write({ id: 4, extra: 1 }))).toEqual({ id: 4 })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(text => readIdMessage(CLOSE_TOPIC, text), ["{}", "{\"id\":\"4\"}"])
    })
})

describe("Order message", () => {
    test("written → read back", () => {
        expect(readOrderMessage(write({ order: { go: 2 } }))).toEqual({ order: { go: 2 } })
    })

    test("no order → read as null", () => {
        expect(readOrderMessage(write({}))).toEqual({ order: null })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readOrderMessage, [])
    })
})

describe("State message", () => {
    test("written → read back", () => {
        expect(readStateMessage(write({ key: "k", value: 3 }))).toEqual({ key: "k", value: 3 })
    })

    test("state taken back → value null", () => {
        expect(readStateMessage(write({ key: "k" }))).toEqual({ key: "k", value: null })
        expect(readStateMessage(write({ key: "k", value: null }))).toEqual({ key: "k", value: null })
    })

    test("falsy values → kept as they are", () => {
        expect(readStateMessage(write({ key: "k", value: 0 }))).toMatchObject({ value: 0 })
        expect(readStateMessage(write({ key: "k", value: "" }))).toMatchObject({ value: "" })
        expect(readStateMessage(write({ key: "k", value: false }))).toMatchObject({ value: false })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readStateMessage, ["{}", "{\"id\":1}", "{\"key\":2}"])
    })
})

describe("Act message", () => {
    test("written → read back", () => {
        expect(readActMessage(write({ id: 1, message: "hi" }))).toEqual({ id: 1, message: "hi" })
    })

    test("no message → null", () => {
        expect(readActMessage(write({ id: 1 }))).toEqual({ id: 1, message: null })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readActMessage, ["{}", "{\"message\":1}", "{\"id\":\"1\"}"])
    })
})

describe("Ask message", () => {
    test("written → read back with its request number", () => {
        expect(readAskMessage(write({ id: 1, req: 9, message: "q" }))).toEqual({ id: 1, req: 9, message: "q" })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readAskMessage, ["{}", "{\"id\":1}", "{\"req\":1}", "{\"id\":1,\"req\":\"1\"}"])
    })
})

describe("Route message", () => {
    test("written → read back, missing info and message as null", () => {
        expect(readRouteMessage(write({ id: 1, from: "p1", name: "Ana" }))).toEqual({
            id: 1, from: "p1", name: "Ana", info: null, message: null,
        })
        expect(readRouteMessage(write({ id: 1, from: "p1", name: "Ana", info: 1, message: 2 }))).toEqual({
            id: 1, from: "p1", name: "Ana", info: 1, message: 2,
        })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readRouteMessage, [
            "{}", "{\"id\":1,\"from\":\"p\"}", "{\"id\":1,\"name\":\"n\"}", "{\"id\":1,\"from\":2,\"name\":\"n\"}",
            "{\"from\":\"p\",\"name\":\"n\"}",
        ])
    })
})

describe("Route ask message", () => {
    test("written → read back with its request number", () => {
        expect(readRouteAskMessage(write({ id: 1, from: "p1", name: "Ana", req: 4, message: "q" }))).toEqual({
            id: 1, from: "p1", name: "Ana", info: null, message: "q", req: 4,
        })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readRouteAskMessage, [
            "{}", "{\"id\":1,\"from\":\"p\",\"name\":\"n\"}", "{\"id\":1,\"from\":\"p\",\"name\":\"n\",\"req\":\"1\"}",
        ])
    })
})

describe("Reply message", () => {
    test("written → read back, no value as null", () => {
        expect(readReplyMessage(write({ req: 1, value: [1] }))).toEqual({ req: 1, value: [1] })
        expect(readReplyMessage(write({ req: 1 }))).toEqual({ req: 1, value: null })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readReplyMessage, ["{}", "{\"req\":\"1\"}"])
    })
})

describe("Answer message", () => {
    test("answered → no fault", () => {
        const message = { req: 1, value: 5, fault: null }
        expect(readAnswerMessage(write(message))).toEqual(message)
    })

    test("refused → the fault told", () => {
        expect(readAnswerMessage(write({ req: 1, fault: "nope" }))).toEqual({ req: 1, value: null, fault: "nope" })
    })

    test("fault that is not a text → no fault", () => {
        expect(readAnswerMessage(write({ req: 1, fault: 3 }))).toEqual({ req: 1, value: null, fault: null })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readAnswerMessage, ["{}", "{\"req\":\"1\"}"])
    })
})
