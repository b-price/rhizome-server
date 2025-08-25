type RequestTask = () => Promise<any>;

class ThrottleQueue {
    private queue: RequestTask[] = [];
    private running = false;
    private delay = 1100;

    enqueue(task: RequestTask): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });

            if (!this.running) {
                this.running = true;
                this.run();
            }
        });
    }

    private async run() {
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) await task();
            await new Promise(res => setTimeout(res, this.delay));
        }
        this.running = false;
    }
}

const throttleQueue = new ThrottleQueue();
export default throttleQueue;
