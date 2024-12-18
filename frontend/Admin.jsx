import axios from "axios";
import urlJoin from "url-join";
import {useParams} from "react-router-dom";

const EXAMPLE_MAIN_URL = window.location.origin;

function Admin()  {
    const { application_id, company_id } = useParams();
    const createScheme = async () => {
        try {
            console.log('Create a new api call to create scheme');
            const {data} = await axios.get(urlJoin(EXAMPLE_MAIN_URL, `/api/products/scheme`), {
                headers: {
                    "x-company-id": company_id,
                }
            });
            console.error(`Response : ${data}`)
        } catch (e) {
            console.error(`Error : ${e}`)
        } finally {
            // nothing to do
        }
    }
    return (
        <>
    <p>Admin Panel</p>
    <button onClick={createScheme}>Create scheme</button>
        </>
)
}

export default Admin;