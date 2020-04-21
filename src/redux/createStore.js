import $$observable from 'symbol-observable';

import ActionTypes from './utils/actionTypes';
import isPlainObject from './utils/isPlainObject';

// 先看这里， 就是我们调用的createStore function了
export default function createStore(reducer, preloadedState, enhancer) {
    // 如果 preloadedState和enhancer都为function，不支持，throw new Error
    // 我们都知道[initState]为object， [enhancer]为function

    if (
        (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
        (typeof enhancer === 'function' && typeof arguments[3] === 'function')
    ) {
        throw new Error(
            'It looks like you are passing several store enhancers to ' +
            'createStore(). This is not supported. Instead, compose them ' +
            'together to a single function'
        );
    }
    // preloadedState为function enhancer为undefined的时候说明initState没有初始化, 但是有middleware
    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
        enhancer = preloadedState; // 把 preloadedState 赋值给 enhancer
        preloadedState = undefined; // preloadedState赋值undeifined
    }

    // debugger
    // 如果参数enhancer存在
    if (typeof enhancer !== 'undefined') {
        // 如果enhancer存在，那他必须是个function, 否则throw Error哈
        if (typeof enhancer !== 'function') {
            throw new Error('Expected the enhancer to be a function.');
        }
        /** 如果传入了enhancer （也即applyMiddleware作用中间件的结果），则直接return。
         * applyMiddleware的代码结构如下
         * (...middlewares) => createStore => (...args) => {
              return {
                ...store,
                dispatch  // 覆盖store中的dispatch
              };
            }
         * 由此可知，执行下边语句之后，返回的结果与没有enhancer时返回的结果，具有相同的数据结构
         * 先给出结论：enhancer其实就是对 dispatch的增强。
         */
        // debugger
        return enhancer(createStore)(reducer, preloadedState);
    }
    // debugger

    // reducer要为function
    if (typeof reducer !== 'function') {
        throw new Error('Expected the reducer to be a function.');
    }

    // 简单过一下定义的变量
    let currentReducer = reducer;  // 临时reducer
    let currentState = preloadedState; //当前的state值，默认为初始化preloadedState
    let currentListeners = [];  // 监听队列，用于存放监听事件， 发布－订阅模式
    let nextListeners = currentListeners; // 浅拷贝下这个队列
    let isDispatching = false; // 标志位，用来判断是否有存在正在执行的dispatch

    // 先看下各个函数的名字， 打眼一看getState，dispatch，subscribe都是比较熟悉的api
    // subscribe，observable再加上定义的数组，应该肯定是监听队列和观察者模式
    // 那我们先看看比较熟悉且暴露出来的api好了先看 -> getState

    // 其实这里是保存一份订阅快照
    function ensureCanMutateNextListeners() {
        //  不要忘了let nextListeners = currentListeners // 浅拷贝下这个队列
        // 判断nextListeners和当前的currentListeners是不是一个引用
        if (nextListeners === currentListeners) {
            // 如果是一个引用的话深拷贝出来一个currentListeners赋值给nextListener
            nextListeners = currentListeners.slice();
        }
    }

    // store.getState()获取当前的state
    function getState() {
        // dispatch中不可以getState, 为什么？
        // 因为dispatch是用来改变state的,为了确保state的正确性(获取最新的state)，所有要判断啦
        if (isDispatching) {
            throw new Error(
                'You may not call store.getState() while the reducer is executing. ' +
                'The reducer has already received the state as an argument. ' +
                'Pass it down from the top reducer instead of reading it from the store.'
            );
        }
        // 确定currentState是当前的state 看 -> subscribe
        return currentState;
    }

    // store.subscribe方法设置监听函数，一旦触发disp atch，就自动执行这个函数
    // listener是一个callback function
    function subscribe(listener) {
        // 类型判断
        if (typeof listener !== 'function') {
            throw new Error('Expected the listener to be a function.');
        }

        // 同理不可以dispatch中
        if (isDispatching) {
            throw new Error(
                'You may not call store.subscribe() while the reducer is executing. ' +
                'If you would like to be notified after the store has been updated, subscribe from a ' +
                'component and invoke store.getState() in the callback to access the latest state. ' +
                'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
            );
        }

        // 用来表示订阅标记，用于避免取消订阅后再次取消
        let isSubscribed = true;
        // ensureCanMutateNextListeners干啥的,点击去看一下
        ensureCanMutateNextListeners();
        // 将 listener 存在在 发布－订阅模式的监听队列 nextListeners 中
        nextListeners.push(listener);
        // 返回取消的function（unsubscribe）
        return function unsubscribe() {
            // 如果已经取消订阅 直接直接return
            if (!isSubscribed) {
                return;
            }

            // 同理
            if (isDispatching) {
                throw new Error(
                    'You may not unsubscribe from a store listener while the reducer is executing. ' +
                    'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
                );
            }

            // 这里标记为 已经取消订阅
            isSubscribed = false;
            // 保存订阅快照
            ensureCanMutateNextListeners();
            // 根据索引 在监听队列里删除监听
            const index = nextListeners.indexOf(listener);
            nextListeners.splice(index, 1);
        };
    }

    // 发送一个action
    function dispatch(action) {
        // acticon必须是由Object构造的函数， 否则throw Error
        if (!isPlainObject(action)) {
            throw new Error(
                'Actions must be plain objects. ' +
                'Use custom middleware for async actions.'
            );
        }

        // 判断action, 不存在type throw Error
        if (typeof action.type === 'undefined') {
            throw new Error(
                'Actions may not have an undefined "type" property. ' +
                'Have you misspelled a constant?'
            );
        }

        // dispatch中不可以有进行的dispatch
        if (isDispatching) {
            throw new Error('Reducers may not dispatch actions.');
        }

        try {
            // 执行时标记为true
            isDispatching = true;
            // reducer形式如下：(state,action)=>{} , reducer本身就是个函数，由此可见dispatch(action), 就是执行reducer方法，并将currentState，action作为参数
            currentState = currentReducer(currentState, action);
        } finally {
            // 最终执行， isDispatching标记为false， 即完成状态·
            isDispatching = false;
        }

        // 循环监听队列，并执行每一个监听事件
        const listeners = (currentListeners = nextListeners);
        for (let i = 0; i < listeners.length; i++) {
            const listener = listeners[i];
            // 执行每一个监听函数
            listener();
        }
        // 返回传入的action
        return action;
    }

    // 这是一个高级的api， 用于替换计算 state的reducer，不知道的同学面壁去
    // 哈哈开玩笑的确实很不常用， 官网也没怎么介绍
    // redux 热加载机制的时候用到了
    function replaceReducer(nextReducer) {
        // 既然是替换reducer， 类型要保持一直，不是function的滚远点
        if (typeof nextReducer !== 'function') {
            throw new Error('Expected the nextReducer to be a function.');
        }

        // 当前的currentReducer更新为参数nextReducer
        currentReducer = nextReducer;
        // 和INIT的dispath相同，发送一个dispatch初始化state，表明一下是REPLACE
        // 自己👀看一下utils方法的ActionTypes， 随性的随机数
        dispatch({ type: ActionTypes.REPLACE });
    }

    // 不知道是干什么的， 先看看哪里用到了， 全局收索一下
    // 我TM！只有这一个地方有这个函数，而且没被使用（ [$$observable]: observable ）， 就问你气不气？
    // 当然不气， 作为不思进取的我觉得不用看这部分了， 算了，简单的过一下， 刚好也不知道$$observable这个私有属性的作用
    // 好了， 全局搜索一下$$observable， 尼玛，对于我这种码农来说， 貌似又是没用的
    // 好吧，我们看一下作者的注释和代码
    function observable() {
        const outerSubscribe = subscribe;
        //
        return {
            /**
             * The minimal observable subscription method.
             * @param {Object} observer Any object that can be used as an observer.
             * The observer object should have a `next` method.
             * @returns {subscription} An object with an `unsubscribe` method that can
             * be used to unsubscribe the observable from the store, and prevent further
             * emission of values from the observable.
             */
            // 参数明显是object
            subscribe(observer) {
                if (typeof observer !== 'object' || observer === null) {
                    throw new TypeError('Expected the observer to be an object.');
                }

                //获取观察着的状态
                function observeState() {
                    // 如果有next方法，吧回调state
                    if (observer.next) {
                        observer.next(getState());
                    }
                }

                observeState();
                //返回取消订阅的方法
                const unsubscribe = outerSubscribe(observeState);
                return { unsubscribe };
            },

            [$$observable]() {
                return this; // 猜测this应该是store
            }
            // observable方法简单过一下，不做过多解释，有了解的同学，欢迎不吝赐教
        };
    }

    // 有没有想过，在使用redux的时候， 初始化的state哪来的
    // 当然是自己先dispatch了一下
    //reducer 返回其初始状态
    //初始化 store 里的 state tree
    dispatch({ type: ActionTypes.INIT });

    // 这个就是返回的store嘛
    return {
        dispatch,
        subscribe,
        getState,
        replaceReducer,
        [$$observable]: observable
    };
}