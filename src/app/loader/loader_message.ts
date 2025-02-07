// Author: Preston Lee

export class LoaderMessage {
    public body: string = '';
    public type: 'success' | 'warning' | 'info' | 'danger' = 'success';
    public date: Date = new Date();
}