declare type IMatrix = [number, number, number, number, number, number];
export declare class Transform {
    context: Transform;
    matrix: IMatrix;
    m?: IMatrix;
    stack: IMatrix[];
    constructor(context?: Transform);
    setContext(context: Transform): void;
    getMatrix(): IMatrix;
    setMatrix(m: IMatrix): void;
    cloneMatrix(m: IMatrix): IMatrix;
    save(): void;
    restore(): void;
    setTransform(): void;
    translate(x: number, y: number): void;
    rotate(rad: number): void;
    scale(sx: number, sy: number): void;
    rotateDegrees(deg: number): void;
    rotateAbout(rad: number, x: number, y: number): void;
    rotateDegreesAbout(deg: number, x: number, y: number): void;
    identity(): void;
    multiply(matrix: {
        m: IMatrix;
    }): void;
    invert(): void;
    transformPoint(pt: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
}
export {};
