GaussKrugerUtil
===============

Simply JavaScript code, used to translate Gauss Kruger project coordinate with LatLon coordinate.

嘿，英文不是很好，为了避免写出一些我都害怕的东西，我还是主动用中文啦。当然，也省
得还得边想边查字典....

工作关系，涉及地理数据的坐标转换，虽然有 GIS 软件可以完成类似高斯坐标到经纬度坐标
的转换，但是我想 web 应用上不会也要在后台服务器做这些事情吧。于是就查了查相关的一
些资料，果然，网上的东西好乱....

好吧，最后还是找到一个 C# 实现的版本，验证了一下，可以用！然后，我果断想，既然 C#
可以用一百多行代码搞定，而且只是其中的计算公式复杂些而已，那么用 JavaScript 应该
也可以解决了。于是，花了几个小时时间，改写了一些，OK。

by luobo 2014/4/23
