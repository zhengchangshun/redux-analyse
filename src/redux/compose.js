// 其实这个很有意思，是函数编程中的方法
//  我们来做一到题
//  实现这个样一个function -> compose(funcA, funcB, funcC) 形象为 compose(funcA(funcB(funcC())))）
//  返回值为一个(...args)=>(funcA(funcB(funcC(...args)))))
/**
 * funcA(next)(action)
 * A -
 * next = funcB(funcC(...args))
 *
 * B-
 * * next = funcC(...args)
 *
 * -c
 * next - dispatch
 * 你可能会这样写， 或者是for循环
 *
 *  function Compose(...funcs){
      if (funcs.length === 0) {
        return args => args;
      }
      if (funcs.length === 1) {
        return funcs[0]
      }
      const arr = funcs;
      let firstFun = arr[0];
      let len = arr.length;
      let i = 1;
      while(i !== len) {
        firstFun = firstFun(arr[i]);
        i++;
      }
      return firstFun;
    }
 *
 *
 */
// 好啦， 我们看看优秀的答案吧 👇

export default function compose(...funcs) {
    if (funcs.length === 0) {
        return arg => arg;
    }

    if (funcs.length === 1) {
        return funcs[0];
    }

    // 是不是很巧妙
    // 其实compose是redux作者从函数式编程中移过来的， 有兴趣的同学去了解一下
    // 插个话， 因为compose的执行顺序原因， 所以有的middleware插件会要求要放在最后面
    const a = funcs.reduce((a, b) => {
        return (...args) => a(b(...args));
    });
    return a;
}