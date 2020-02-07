# yesplash
yes !!  unsplash available  !  
定时更换随机壁纸应用。
使用unsplash源，由于unsplash无法访问，特增加了通过代理下载unsplash 照片。
支持 http，socks5。

![preview](https://raw.githubusercontent.com/sammeishi/yesplash/master/preview.jpg)

#### 支持平台
1. win7以上
2. 非win平台，你可以自己使用electron-builder编译 

#### 如何使用
编辑 config.yml，配置你的unsplash开发者密钥即可
已经内置一个网上搜来的密钥

#### 下载
[下载页面](https://github.com/sammeishi/yesplash/releases)

#### config.yml配置项说明
1. proxy 如果使用代理下载unsplash图片，请开启并设置代理地址端口。
2. unsplash. AccessKey 接口访问密钥（unsplash官网注册开发者可创建）
3. interval 定时更换间隔，单位秒

#### TODO
1. 开机启动
