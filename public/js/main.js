$(function(){
    if($('textarea#ta').length)
    {
        CKEDITOR.replace('ta')
    }
    $('a.confirmation').on("click",()=>{
        if(!confirm("Confirm Deletion"))
        return false
        
    })
    if($('[data-fancybox]').length)
    {
        $('[data-fancybox]').fancybox()
    }
})