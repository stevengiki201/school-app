import { useRouter } from "expo-router"


const ExitScreen = ()=>{
    const router=useRouter()
    return(
        router.push("/")
    )
}
export default ExitScreen