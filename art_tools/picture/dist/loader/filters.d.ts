export namespace FILTER_LOADERS {
    let normal: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let burning: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let burned: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let fiery: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let furry: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let auto_depth: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let thickness_depth: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let sayan: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let slimy: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let zombie: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let drug: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let weird: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let thin: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let fato: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let look_left: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let look_up: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let look_down: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let look_right: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let excroissances: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let ghost: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let drippy: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let broken: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
    let fit_to: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
        id: string;
        description?: string;
    };
}
/** The router: "furry" is the default instance, {"id":"drippy","dy":2} is a configured one. */
export const FILTERS: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture> & {
    entries: {
        [id: string]: import("./kit.js").Loader<(picture: any) => import("../Picture.js").Picture>;
    };
    ids: string[];
};
/** Zero or more filters, in order. */
export const FILTER_LIST: import("./kit.js").Loader<((picture: any) => import("../Picture.js").Picture)[]>;
