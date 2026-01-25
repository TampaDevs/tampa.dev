declare module 'hbs-async-render' {
  export function hbsAsyncRender(
    handlebars: any,
    templateName: string,
    context: any
  ): Promise<string>;
}
