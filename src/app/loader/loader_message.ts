// Author: Preston Lee

export class LoaderMessage {
    public body: string = '';
    public type: 'primary' | 'secondary' | 'info' | 'danger' = 'primary';
    public date: Date = new Date();
}